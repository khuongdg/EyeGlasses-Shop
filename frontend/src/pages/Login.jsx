import { Button, Form, Input, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../services/authService';
import { useEffect, useState } from 'react'; // Thêm useState
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Quản lý trạng thái nút bấm

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      // Chuyển hướng mượt mà bằng navigate
      navigate(role === 'ADMIN' ? '/admin' : '/staff');
    }
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true); // Bắt đầu load
    try {
      const res = await login(values);
      const { token, user } = res.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);

      message.success('Đăng nhập thành công');

      // Chuyển hướng dựa trên quyền hạn
      navigate(user.role === 'ADMIN' ? '/admin' : '/staff');
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.'
      );
    } finally {
      setLoading(false); // Kết thúc load
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm shadow-xl rounded-xl border border-slate-200">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-slate-800">Thuan Thien EyeGlasses</div>
          <div className="text-sm text-slate-500 mt-1">Hệ thống quản trị cửa hàng kính mắt</div>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined className="text-slate-400" />}
              placeholder="Tên đăng nhập"
              disabled={loading} 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder="Mật khẩu"
              disabled={loading}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            className="mt-2"
          >
            Đăng nhập
          </Button>
        </Form>

        <div className="mt-6 text-center text-xs text-slate-400">
          © 2026 Thuan Thien EyeGlasses Shop
        </div>
      </Card>
    </div>
  );
};

export default Login;