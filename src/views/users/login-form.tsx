import { Button, Form, Input, Typography, message, Checkbox } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authService } from '@app/services/api/auth/auth.service';
import { ApiClientError } from '@app/services/api';
import type { IApiErrorPayload, ILoginCredentials } from '@app/types/api';

// B1: Import hook useAuth từ Context
import { useAuth } from '@app/hooks/useAuth';

const { Title } = Typography;

const LoginForm = () => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();

    // B2: Lấy hàm login từ context
    const { login } = useAuth();

    const onFinish = async (values: ILoginCredentials & { remember: boolean }) => {
        setIsLoading(true);
        try {
            const response = await authService.login(values);
            const { user, access_token, refresh_token } = response;


            login(user, access_token, refresh_token, values.remember);
            
            messageApi.success('Đăng nhập thành công!');
            navigate('/'); // Chuyển hướng đến trang chủ

        } catch (error) {
            console.error('❌ Đã xảy ra lỗi khi đăng nhập:', error);
            if (error instanceof ApiClientError) {
                const apiErrorData = error.payload as IApiErrorPayload | undefined;
                const errorMessage = apiErrorData?.message || error.message || 'Lỗi không xác định từ server.';
                messageApi.error(errorMessage);
            } else {
                messageApi.error('Một lỗi không mong muốn đã xảy ra. Vui lòng thử lại.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onFinishFailed = () => {
        message.error('Vui lòng điền đầy đủ và chính xác thông tin!');
    };

    return (
        <>
            {contextHolder}
            <div style={{ maxWidth: 400, margin: '50px auto', padding: '24px', border: '1px solid #f0f0f0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
                    Đăng nhập
                </Title>
                <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    initialValues={{ remember: true }}
                    autoComplete="off"
                >
                    {/* Các Form.Item giữ nguyên như cũ */}
                    <Form.Item
                        name="username"
                        label="Tên đăng nhập / Email"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập hoặc email!' }]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Tên đăng nhập hoặc Email" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Mật khẩu"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>

                    <Form.Item name="remember" valuePropName="checked">
                        <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={isLoading}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </>
    );
};

export default LoginForm;

